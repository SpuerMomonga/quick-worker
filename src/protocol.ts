export const enum WireValueType {
  RAW = 'RAW',
  PROXY = 'PROXY',
  THROW = 'THROW',
  HANDLER = 'HANDLER',
}

export interface RawWireValue {
  id?: string;
  type: WireValueType.RAW;
  value: object;
}

export interface HandlerWireValue {
  id?: string;
  type: WireValueType.HANDLER;
  name: string;
  value: unknown;
}

export type WireValue = RawWireValue | HandlerWireValue;

export type MessageID = string;

export const enum MessageType {
  GET = 'GET',
  SET = 'SET',
  RUN = 'RUN',
  APPLY = 'APPLY',
  CONSTRUCT = 'CONSTRUCT',
  ENDPOINT = 'ENDPOINT',
  RELEASE = 'RELEASE',
}

export interface GetMessage {
  id?: MessageID;
  type: MessageType.GET;
  path: string[];
}

export interface SetMessage {
  id?: MessageID;
  type: MessageType.SET;
  path: string[];
  value: WireValue;
}

export interface ApplyMessage {
  id?: MessageID;
  type: MessageType.APPLY;
  path: string[];
  argumentList: WireValue[];
}

export interface RunMessage {
  id?: MessageID;
  type: MessageType.RUN;
  fn: string;
  argumentList: WireValue[];
}

export interface ConstructMessage {
  id?: MessageID;
  type: MessageType.CONSTRUCT;
  path: string[];
  argumentList: WireValue[];
}

export interface EndpointMessage {
  id?: MessageID;
  type: MessageType.ENDPOINT;
}

export interface ReleaseMessage {
  id?: MessageID;
  type: MessageType.RELEASE;
}

export type Message =
  | GetMessage
  | SetMessage
  | RunMessage
  | ApplyMessage
  | ConstructMessage
  | EndpointMessage
  | ReleaseMessage;

export interface EventSource {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: any): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: any): void;
}

export interface Endpoint extends EventSource {
  postMessage(message: any, transfer?: Transferable[]): void;
  start?: () => void;
}
