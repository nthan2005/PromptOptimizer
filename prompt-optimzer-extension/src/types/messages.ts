// Message types for IPC communication

export type MessageType = 
  | 'OPTIMIZE_REQUEST'
  | 'OPTIMIZE_RESPONSE'
  | 'FEEDBACK'
  | 'PING'
  | 'PONG';

export interface BaseMessage {
  type: MessageType;
  id: string;
  timestamp: number;
}

export interface OptimizeRequest extends BaseMessage {
  type: 'OPTIMIZE_REQUEST';
  payload: {
    draft: string;
    site?: string;
    lang?: string;
    hasCode?: boolean;
    lenBucket?: string;
  };
}

export interface TemplateCard {
  filledText: string;
  templateId: string;
  title: string;
  unresolved: string[];
}

export interface OptimizeResponse extends BaseMessage {
  type: 'OPTIMIZE_RESPONSE';
  payload: {
    cards: TemplateCard[];
    cacheKey: string;
    timings: Record<string, number>;
  };
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
}

export interface PongMessage extends BaseMessage {
  type: 'PONG';
  payload: {
    status: 'ok';
  };
}

export type Message = OptimizeRequest | OptimizeResponse | PingMessage | PongMessage;