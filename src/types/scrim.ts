import { Application } from './application';
import { prop } from '@typegoose/typegoose';

export class Scrim {
    @prop() _id?: string;
    @prop() title: string;

    @prop() application?: Application;

    @prop() startTime?: number;
}
