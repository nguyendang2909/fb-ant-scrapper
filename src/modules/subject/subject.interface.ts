import { subjectType } from './subject.enum';

export interface IGetSubject {
  name: string;
  link: string;
  type: subjectType;
  isTracking: boolean;
}

export interface ISubject {
  _id: string;
  name: string;
  link: string;
  type: subjectType;
  isTracking: boolean;
}
