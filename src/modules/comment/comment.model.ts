import { Document, model, Types, Schema } from 'mongoose';

export interface IComment extends Document {
  author: string;
  profile: string;
  content: string;
  postId: string;
}

const commentSchema: Schema = new Schema(
  {
    author: {
      type: String,
      required: true,
    },
    profile: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    postId: {
      type: Types.ObjectId,
      ref: 'fbPost',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default model<IComment>('comment', commentSchema);
