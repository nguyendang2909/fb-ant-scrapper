import { Model } from 'mongoose';
import { IUpdateComment, ICommentInfo } from './comment.interface';
import CommentModel, { IComment } from './comment.model';
import { ElementHandle, Page } from 'puppeteer';

class CommentService {
  commentModel: Model<IComment>;

  constructor() {
    this.commentModel = CommentModel;
  }

  public async createOrUpdate(postCmt: IUpdateComment) {
    await this.commentModel.updateOne(
      {
        author: postCmt.author,
        profile: postCmt.profile,
        content: postCmt.content,
        postId: postCmt.postId,
      },
      {
        author: postCmt.author,
        profile: postCmt.profile,
        content: postCmt.content,
        postId: postCmt.postId,
      },
      {
        new: true,
        upsert: true,
        rawResult: true,
      },
    );
  }

  public async getInfo(commentHtml: ElementHandle<Element>): Promise<ICommentInfo> {
    const contentSelector = 'div[data-sigil="comment-body"]';
    const authorSelector = 'a';

    // Get author
    const authorHtml = (await commentHtml.$$(authorSelector))[1];
    const unparsedAuthor = await authorHtml.getProperty('innerText');
    const author: string = await unparsedAuthor.jsonValue();

    // Get profile
    const profileHtml = await commentHtml.$('a');
    const profile: string = await (await profileHtml.getProperty('href')).jsonValue();

    // Get content
    const contentHtml = await commentHtml.$(contentSelector);
    const content: string = await (await contentHtml.getProperty('innerText')).jsonValue();

    // Get author profile

    return { author, profile, content };
  }

  public async getMany(page: Page): Promise<ICommentInfo[]> {
    try {
      const postComment = await page.evaluate(() => {
        const cmtsSelector = 'div[data-sigil="comment"]';
        const authorSelector = 'a';
        const contentSelector = 'div[data-sigil="comment-body"]';

        const cmts = [];

        const cmtsHtml = document.querySelectorAll(cmtsSelector);
        cmtsHtml.forEach((cmtHtml) => {
          // Get author
          const authorHtml = cmtHtml.querySelectorAll(authorSelector)[1];
          const author = authorHtml ? authorHtml.innerText : '';

          // Get profile
          const profileHtml = cmtHtml.querySelector(authorSelector);
          const profile = profileHtml ? profileHtml.getAttribute('href') : '';

          const contentHtml = cmtHtml.querySelector(contentSelector);
          const content = contentHtml ? (<HTMLElement>contentHtml).innerText : '';

          cmts.push({ author, profile, content });
        });

        return cmts;
      });

      return postComment;
    } catch (err) {
      return [];
    }
  }
}

export default CommentService;
