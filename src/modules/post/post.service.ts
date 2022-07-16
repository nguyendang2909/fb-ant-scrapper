import momentTz from 'moment-timezone';
import { Model } from 'mongoose';
import PostModel, { IPost } from './post.model';
import { IUpdatePost, IPostCmtShare, IPostReaction, IPostAnalystics } from './post.interface';
import { ElementHandle, Page } from 'puppeteer';
import loggerFactory from '../../lib/logger-factory';
import axios from 'axios';
import { AI_API, FB_ANT_BOT_ID } from '../../config';
import { EPostProcessingStatus, EPostRate } from '../common/enum';

const logger = loggerFactory.getLogger(__filename);

class PostService {
  postModel: Model<IPost>;

  constructor() {
    this.postModel = PostModel;
  }

  public async upsert(post: IUpdatePost): Promise<void> {
    let existRecord: IPost;

    const postLink = post.link;

    if (postLink.includes('fbid=')) {

      // const linkUid = new RegExp(post.link.split('fbid=').pop().split('&').shift(), 'i');
      
      const postLinkSplitter = postLink.split('fbid=');

      const nextPostLinkSplitter = postLinkSplitter[1].split('&');

      const postUid = nextPostLinkSplitter[0];

      const linkUid = new RegExp(postUid, 'i');
     
      existRecord = await this.postModel.findOne({ link: linkUid });
    } else if (post.link.includes('story_key.')) {
      const linkUid = new RegExp(post.link.split('story_key.').pop().split('%').shift(), 'i');

      existRecord = await this.postModel.findOne({ link: linkUid });
    } else {
      existRecord = await this.postModel.findOne({ link: post.link });
    }

    if (existRecord) {
      await existRecord.updateOne({
        fbTarget: post.fbTarget,
        link: post.link,
        content: post.content,
        time: post.time,
        unformattedTime: post.unformattedTime,
        commentTotal: post.commentTotal,
        shareTotal: post.shareTotal,
        reactionTotal: post.reactionTotal,
        person: post.person,
        organization: post.organization,
      });
    } else {
      await this.postModel.create({
        fbTarget: post.fbTarget,
        link: post.link,
        content: post.content,
        time: post.time,
        unformattedTime: post.unformattedTime,
        commentTotal: post.commentTotal,
        shareTotal: post.shareTotal,
        reactionTotal: post.reactionTotal,
        person: post.person,
        organization: post.organization,
        processingStatus: EPostProcessingStatus.UNPROCESSED,
        rate: EPostRate.NOT_RATE,
        createdBy: FB_ANT_BOT_ID,
        updatedBy: FB_ANT_BOT_ID,
      });
    }
  }

  public getTime(postTime: string): Date {
    const vietnamTimezone = 'Asia/Ho_Chi_Minh';
    try {
      const time = postTime.toLowerCase().trim();

      const splitTime = time.split(' ');

      if (time.includes('tháng') && time.includes(',')) {
        const day = splitTime[0];
        const month = parseInt(splitTime[2]);
        const year = parseInt(time.split(', ')[1]);
        const hour = splitTime[splitTime.length - 1];

        const postTimeInString = `${day}-${month}-${year} ${hour}`;
        const postTimeFormat = 'DD-MM-YYYY HH:mm';

        return momentTz(postTimeInString, postTimeFormat).tz(vietnamTimezone).toDate();
      }

      if (time.includes('tháng')) {
        const day = splitTime[0];
        const month = splitTime[2];
        const hour = splitTime[splitTime.length - 1];

        const postTimeInString = `${day}-${month} ${hour}`;
        const postTimeFormat = 'DD-MM HH:mm';

        return momentTz(postTimeInString, postTimeFormat).tz(vietnamTimezone).toDate();
      }

      if (time.includes('hôm qua')) {
        const hour = splitTime[splitTime.length - 1];

        const postTimeInString = hour;
        const postTimeFormat = 'HH:mm';

        return momentTz(postTimeInString, postTimeFormat).subtract(1, 'days').tz(vietnamTimezone).toDate();
      }

      if (time.includes('giờ')) {
        const hoursAgo = splitTime[0];

        const postTimeInString = hoursAgo;
        const postTimeFormat = 'hours';

        return momentTz().subtract(postTimeInString, postTimeFormat).tz(vietnamTimezone).toDate();
      }

      if (time.includes('phút')) {
        const minutesAgo = splitTime[0];

        return momentTz().subtract(minutesAgo, 'minutes').tz(vietnamTimezone).toDate();
      }

      return momentTz().tz(vietnamTimezone).toDate();
    } catch (err) {
      logger.error({ message: `Cannot get time from ${postTime}` });
      return momentTz().toDate();
    }
  }

  public async getContent(postHtml: ElementHandle<Element>): Promise<string> {

    try {
      let content = '';
      const contentHtmls = await postHtml.$$('div[data-gt][data-ft]');
      content = await (await contentHtmls[0].getProperty('innerText')).jsonValue();
      if (contentHtmls.length > 1) {
        const sharePostContent: string = await (await contentHtmls[1].getProperty('innerText')).jsonValue();
        content = content.concat("\n\n* Nội dung bài Share:\n", sharePostContent);
      }

      return content || '';

    } catch (error) {
      console.log(error);
    }
    
  }

  // public async getContent(postHtml: ElementHandle<Element>): Promise<string> {
  //   let text= '';
  //   try {

  //     const postShareContentSelector = 'div[data-ft] p';
  //     const postShareContentHtmls = await postHtml.$$(postShareContentSelector);

  //     for(const postShareContentHtml of postShareContentHtmls) {
  //       const postShareContentJSON = await postShareContentHtml.getProperty('innerText');
  //       const postShareContent = await postShareContentJSON.jsonValue();
  //       if (!postShareContent)
  //       {
  //         const postContentSelector = 'div[data-gt][data-ft]';
  //         const postContentHtml = await postHtml.$(postContentSelector);
  //         const postContentJSON = await postContentHtml.getProperty('innerText');
  //         const postContent: string = await postContentJSON.jsonValue();
  //        text += postContent;
  //       }
  //       else
  //       {  const postShareContent = await postShareContentJSON.jsonValue();
  //        text+=`${postShareContent}\\n`;

  //       }     
  //     }
      
  //     console.log(text);

  //     return text || '';
  //   } catch (error) {
  //     console.log(error);
  //   }
    
  // }

  public async getCmtShare(postReactionsHtml: ElementHandle<Element>[]): Promise<IPostCmtShare> {
    let postCommentTotal = '0';
    let postShareTotal = '0';

    try {
      for (const postReactionHtml of postReactionsHtml) {
        const postReaction: string = await (await postReactionHtml.getProperty('innerText')).jsonValue();
        if (postReaction.includes('chia sẻ')) {
          postShareTotal = this.getCmtShareTotalFromString(postReaction);
        }
        if (postReaction.includes('bình luận')) {
          postCommentTotal = this.getCmtShareTotalFromString(postReaction);
        }
      }
    } catch (err) {
      logger.error({ message: err.stack || err });
    }

    return { postShareTotal, postCommentTotal };
  }

  public async getReactionTotal(postHtml: ElementHandle<Element>): Promise<string> {
    try {
      const reactionSelector = 'div[data-sigil="reactions-sentence-container"]';
      const reactionTotalSelector = 'div[aria-label]';
      const reactionHtml = await postHtml.$(reactionSelector);

      const reactionTotalHtml = await reactionHtml.$(reactionTotalSelector);
      const reactionTotalString: string = await (await reactionTotalHtml.getProperty('innerText')).jsonValue();
      const reactionTotal = this.getReactionTotalFromString(reactionTotalString);
      return reactionTotal;
    } catch (err) {
      return '0';
    }
  }
  private getCmtShareTotalFromString(reactionText: string): string {
    reactionText = reactionText.split(' ')[0];
    if (reactionText.includes(',')) {
      return reactionText.replace('K', '00+').replace(',', '');
    } else if (reactionText.includes('K')) {
      return reactionText.replace('K', '000+');
    } else return reactionText;
  }
  private getReactionTotalFromString(reactionText: string): string {
    if (reactionText.includes(',')) {
      return reactionText
        .split(' ')
        .find((e: string) => e.includes(','))
        .replace('K', '00')
        .replace(',', '');
    } else if (reactionText.includes('K')) {
      return reactionText.replace('K', '000+');
    } else if (reactionText.length > 4) {
      return reactionText.slice(reactionText.lastIndexOf('v') + 3, reactionText.lastIndexOf('n'));
    } else return reactionText;
  }

  public async getReactions(reactLink: string, page: Page): Promise<IPostReaction> {
    const likeSelector = 'span[data-store="{\\"reactionType\\":1}"]';
    const loveSelector = 'span[data-store="{\\"reactionType\\":2}"]';
    const wowSelector = 'span[data-store="{\\"reactionType\\":3}"]';
    const hahaSelector = 'span[data-store="{\\"reactionType\\":4}"]';
    // const likeReactSelector = 'span[data-store="{\\"reactionType\\":5}"]';
    // const likeReactSelector = 'span[data-store="{\\"reactionType\\":6}"]';
    const sadSelector = 'span[data-store="{\\"reactionType\\":7}"]';
    const angrySelector = 'span[data-store="{\\"reactionType\\":8}"]';
    const careSelector = 'span[data-store="{\\"reactionType\\":16}"]';

    await page.goto(reactLink).catch((err) => {
      logger.warn({ message: `Cannot go to ${reactLink} with an error ${err.stack || err}` });
    });

    const likeTotal = await this.getReaction(likeSelector, page);
    const loveTotal = await this.getReaction(loveSelector, page);
    const wowTotal = await this.getReaction(wowSelector, page);
    const hahaTotal = await this.getReaction(hahaSelector, page);
    const sadTotal = await this.getReaction(sadSelector, page);
    const angryTotal = await this.getReaction(angrySelector, page);
    const careTotal = await this.getReaction(careSelector, page);

    await page.close().catch((err) => {
      logger.error({ message: `Cannot close page with an error ${err.stack || err}` });
    });

    return { likeTotal, loveTotal, wowTotal, hahaTotal, sadTotal, angryTotal, careTotal };
  }

  private async getReaction(selector: string, page: Page) {
    try {
      const reactionHtml = await page.$(selector);
      return parseInt(await (await reactionHtml.getProperty('innerText')).jsonValue());
    } catch (err) {
      return 0;
    }
  }

  public async analysisPostContent(postContent: string): Promise<IPostAnalystics> {
    let person = '';
    let location = '';
    let organization = '';
    try {
      const analystics = (await axios.post(AI_API, { data: postContent })).data;

      if (analystics && analystics.length > 0) {
        for (const analystic of analystics) {
          if (analystic[0] === 'B-PER') person += `${analystic[1]}, `;
          if (analystic[0] === 'B-LOC') location += `${analystic[1]}, `;
          if (['B-ORG', 'I-ORG'].includes(analystic[0])) organization += `${analystic[1]}, `;
        }
      }

      return { person, location, organization };
    } catch (err) {
      logger.warn({ message: 'Không kết nối được AI' });
      return { person, location, organization };
    }
  }

  public async clickAllSeeMoreLinksByFbPage(page: Page): Promise<void> {
    try {
      const seeMoreLinksSelector = 'span[data-sigil="more"]';
      await page.evaluate((sel) => {
        const seeMoreLinks = document.querySelectorAll(sel);

        for (let i = 0; i < seeMoreLinks.length; i += 1) {
          const seeMoreLink = seeMoreLinks[i];
          seeMoreLink.click();
        }
      }, seeMoreLinksSelector);

      // const seeMoreLinks = await page.$$(seeMoreLinksSelector);
      // for (const seeMoreLink of seeMoreLinks) {
      //   await seeMoreLink.click();
      // }
    } catch (err) {
      logger.debug({ message: 'Do not see the see more link' });
    }
  }
}

export default PostService;
