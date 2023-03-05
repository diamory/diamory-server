interface Account {
  v: 1;
  accountId: string;
  username: string;
  status: string;
  suspended: number;
  times: number;
  expires: number;
  trial: boolean;
}

export { Account };
