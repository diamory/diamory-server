interface DiamoryItem {
  id: string;
  payloadTimestamp: number;
  checksum: string;
  keepOffline: boolean;
}

interface DiamoryItemWithAccountId extends DiamoryItem {
  accountId: string;
}

export { DiamoryItem, DiamoryItemWithAccountId };
