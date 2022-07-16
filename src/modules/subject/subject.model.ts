// import { model, Schema } from 'mongoose';
// import { subjectType } from './subject.enum';

// // export interface ISubject extends Document {
// //   name: string;
// //   link: string;
// //   group: subjectType;
// //   isTracking: boolean;
// // }

// const subjectSchema: Schema = new Schema(
//   {
//     name: {
//       type: String,
//     },
//     link: {
//       type: String,
//       required: true,
//     },
//     type: {
//       type: String,
//       enum: subjectType,
//       required: true,
//     },
//     isTracking: {
//       type: Boolean,
//       required: true,
//       default: true,
//     },
//   },
//   {
//     timestamps: true,
//   },
// );

// export default model<ISubject>('fbTarget', subjectSchema);
