export interface IUpdatePost {
  fbTarget: string;
  link: string;
  content: string;
  time: Date;
  unformattedTime: string;
  commentTotal: string;
  shareTotal: string;
  reactionTotal: string;
  person: string;
  location: string;
  organization: string;
}

export interface IPostCmtShare {
  postShareTotal: string;
  postCommentTotal: string;
}

export interface IPostReaction {
  likeTotal: number;
  loveTotal: number;
  wowTotal: number;
  hahaTotal: number;
  sadTotal: number;
  angryTotal: number;
  careTotal: number;
}

export interface IPostInfo {
  link: string;
  content: string;
  time: Date;
  unformattedTime: string;
  commentTotal: string;
  shareTotal: string;
  reactionTotal: string;
}

export interface IPostAnalystics {
  person: string;
  location: string;
  organization: string;
}
