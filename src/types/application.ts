import { prop } from '@typegoose/typegoose';

export class Application {
    @prop() _id: string;
    @prop() userId: string;
    @prop() timeInitiated: number;

    @prop() scrim?: string;
    @prop() teamName?: string;
    @prop() averageSr?: string;
}
