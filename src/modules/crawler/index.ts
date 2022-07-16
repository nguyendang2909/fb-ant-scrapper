import puppeteer from 'puppeteer';
import cookie from 'cookie';
import loggerFactory from '../../lib/logger-factory';
import PostService from '../post/post.service';
import CommentService from '../comment/comment.service';
import { DEFAULT_BROWSER_SLOWMO, DEFAULT_FB_PAGE_SCROLL, FB_ANT_FB_PASS, FB_ANT_FB_USER, FB_COOKIE } from '../../config';
import { IPostInfo } from '../post/post.interface';
import { ISubject } from '../subject/subject.interface';
import { FB_ANT_TOKEN } from '../../config';
import delay from 'delay';
import * as twofactor from 'node-2fa';
// const twofactor = require('node-2fa');
const logger = loggerFactory.getLogger(__filename);

const isHeadless = false;

class FbCrawler {
  browser: puppeteer.Browser;
  page: puppeteer.Page;
  postService: PostService;
  commentService: CommentService;

  constructor() {
    this.postService = new PostService();
    this.commentService = new CommentService();
  }

  async safeCrawl(subjects: ISubject[]) {
    try {
      await this.crawl(subjects);
    } catch (err) {
    } finally {
      delay(1000 * 60 * 5);
    }
  }

  async crawl(subjects: ISubject[]): Promise<void> {
    logger.info({ message: `Số lượng tài khoản để quét: ${subjects.length}` });

    for (const subject of subjects) {
      try {
        const subjectUrl = `https://m.facebook.com/${subject.link}`;

        await this.page.goto(subjectUrl, { waitUntil: 'networkidle0', timeout: 10000 }).catch((err) => {
          logger.error({ message: 'Trang loi ko vao duoc' });
          throw new Error(err);
        });

        logger.info({ message: `Đã truy cập ${subjectUrl} và bắt đầu quét đối tượng ${subject.name}` });

        await this.page.evaluate((scroll) => {
          window.scrollBy(100, scroll);
        }, DEFAULT_FB_PAGE_SCROLL);

        await this.page.waitForTimeout(5000);

        await this.page.evaluate((scroll) => {
          window.scrollBy(100, scroll);
        }, DEFAULT_FB_PAGE_SCROLL);

        await this.page.waitForTimeout(5000);

        await this.postService.clickAllSeeMoreLinksByFbPage(this.page);

        const postsSelector = 'article[data-sigil]';
        await this.page.waitForSelector(postsSelector);
        const postsHtml = await this.page.$$(postsSelector);

        logger.info({ message: `Đối tượng ${subject.name}: Quét ${postsHtml.length} bài viết` });

        for (let i = 0, postsHtmlCount = postsHtml.length; i < postsHtmlCount; i += 1) {
          const postHtml = postsHtml[i];
          logger.debug({ message: `Quét bài viết đối tượng ${subject.name}: ${i + 1}/${postsHtmlCount}` });

          const post = await this.getPostInformationFromPost(postHtml);

          const postAnalystics = await this.postService.analysisPostContent(post.content);

          await this.postService.upsert({
            fbTarget: subject._id,
            ...post,
            ...postAnalystics,
          });
        }
      } catch (err) {
        logger.error({ message: err.stack || err });
      } finally {
      }
    }

    // await this.browser.close();
  }

  public async openBrowser(): Promise<puppeteer.Browser> {
    this.browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome-stable',
      timeout: 30000,
      // Hide Chrome or not?
      headless: isHeadless,
      slowMo: DEFAULT_BROWSER_SLOWMO,
      // userDataDir: '/home/quynh/.config/google-chrome',
      args: [
        // '--user-data-dir=/home/quynh/.config/google-chrome',
        // '--profile-directory=Profile 1',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-notifications',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: {
        width: 1600,
        height: 900,
      },
    });

    return this.browser;
  }

  public async loginFb() {
    await this.page.goto('https://facebook.com', { waitUntil: 'networkidle2' });

    await this.page.waitForSelector('#email');

    await this.page.type('#email', FB_ANT_FB_USER);

    await this.page.type('#pass', FB_ANT_FB_PASS);

    await this.page.waitForTimeout(1000);

    try {
      await this.page.click('#loginbutton');
    } catch (err) {
      await this.page.click('button[name=login]');
    }

    await delay(2000);

    try {
      const test = twofactor.generateToken(FB_ANT_TOKEN);

      const fa2 = JSON.stringify(Object.values(test)).slice(2, 8);

      await this.page.waitForSelector('#approvals_code');

      await this.page.type('#approvals_code', fa2);

      await this.page.click('#checkpointSubmitButton');

      await this.page.waitForSelector('#checkpointSubmitButton');

      await this.page.click('#checkpointSubmitButton');

      await delay(5000);
    } catch (error) {
      logger.warn('Không đăng nhập 2fa');
    }

    const iPhone = puppeteer.devices['iPhone X'];

    await this.page.emulate(iPhone);

    logger.info({ message: 'Mở trình duyệt Chrome và đăng nhập facebook thành công!' });
  }

  public async newPage(): Promise<puppeteer.Page> {
    this.page = await this.browser.newPage();
    return this.page;
  }

  private async addFbCookie(): Promise<void> {
    const browserCookie = [];
    const fbCookie = cookie.parse(FB_COOKIE);
    for (const [key, value] of Object.entries(fbCookie)) {
      browserCookie.push({
        name: key,
        value,
        domain: '.facebook.com',
      });
    }
    await this.page.setCookie(...browserCookie);
  }

  private async getPostInformationFromPost(postHtml: puppeteer.ElementHandle<Element>): Promise<IPostInfo> {
    const postReactionsSelector = 'div[data-sigil="reactions-bling-bar"] span';
    // Get post comment & share
    const postReactionsHtml = await postHtml.$$(postReactionsSelector);
    const { postShareTotal, postCommentTotal } = await this.postService.getCmtShare(postReactionsHtml);

    // Get post reactions
    const postReactionTotal = await this.postService.getReactionTotal(postHtml);

    // Get post link & post time
    const postLinkSelector = 'div[data-sigil="m-feed-voice-subtitle"] a';
    const postLinkHtml = await postHtml.$(postLinkSelector);
    const postLink: string = await (await postLinkHtml.getProperty('href')).jsonValue();
    const unformattedPostTime: string = await (await postLinkHtml.getProperty('innerText')).jsonValue();
    const postTime: Date = this.postService.getTime(unformattedPostTime);
    logger.debug({ message: `Bài viết đăng lúc ${postTime}. Link bài viết: ${postLink}` });

    // Get post content
    const postContent = await this.postService.getContent(postHtml);

    return {
      link: postLink,
      content: postContent,
      time: postTime,
      unformattedTime: unformattedPostTime,
      commentTotal: postCommentTotal,
      shareTotal: postShareTotal,
      reactionTotal: postReactionTotal,
    };
  }
}

export default FbCrawler;
