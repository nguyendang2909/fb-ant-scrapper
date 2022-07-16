import { Document, model, Types, Schema } from 'mongoose';
import { FB_ANT_FB_POST_COLLECTION_NAME } from '../../config';
import { EPostProcessingStatus, EPostRate } from '../common/enum';

export interface IPost extends Document {
  link: string;
  content: string;
  time: Date;
  commentTotal: string;
  shareTotal: string;
  reactionTotal: string;
  subjectId: string;
}

const postSchema: Schema = new Schema(
  {
    fbTarget: {
      type: Types.ObjectId,
      ref: 'fbTarget',
      required: true,
    },
    link: {
      index: true,
      type: String,
      required: true,
      unique: true,
    },
    content: {
      type: String,
      text: true,
      default: '',
    },
    time: {
      type: Date,
      required: true,
    },
    unformattedTime: {
      type: String,
      required: true,
    },
    commentTotal: {
      type: String,
    },
    shareTotal: {
      type: String,
    },
    reactionTotal: {
      type: String,
    },
    person: {
      type: String,
    },
    location: {
      type: String,
    },
    organization: {
      type: String,
    },
    processingStatus: {
      index: true,
      type: Number,
      required: true,
      default: EPostProcessingStatus.UNPROCESSED,
    },
    rate: {
      index: true,
      type: Number,
      enum: EPostRate,
      required: true,
      default: EPostRate.NOT_RATE,
    },
    createdBy: {
      type: Types.ObjectId,
      required: true,
      ref: 'user',
    },
    updatedBy: {
      type: Types.ObjectId,
      required: true,
      ref: 'user',
    },
  },
  {
    timestamps: true,
  },
);

export default model<IPost>(FB_ANT_FB_POST_COLLECTION_NAME, postSchema);
