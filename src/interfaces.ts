export interface Reply {
  id: string;
  content: string;
  user: string;
  timestamp: number;
}

export interface Post {
  id: string;
  content: string;
  user: string;
  timestamp: number;
  os: string;
  replies?: Reply[];
  likes?: string[];
  attachment?: string;
  profile_only?: boolean;
  premium?: boolean;
  original_post?: Post;
}

export interface Transaction {
    amount: number,
    new_total: number,
    note: string,
    time: number,
    type: string,
    user: string,
    [key: string]: any
}

