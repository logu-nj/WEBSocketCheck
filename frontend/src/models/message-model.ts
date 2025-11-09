export interface MessageModel{
    message:string;
    fromUser:string;
    toUser:string;
    type:MessageType;
    time:string;
}

export enum MessageType{
    Message,
    Notification
}