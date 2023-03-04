interface Account {
  v: 1;
  accountId: string;
  username: string;
  status: string;
  suspended: number;
  credit: number;
  expires: number;
  trial: boolean;
}

export { Account };
