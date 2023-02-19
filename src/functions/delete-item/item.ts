interface DiamoryItem {
  id: string;
  payloadTimestamp: number;
  checksum: string;
}

interface DiamoryItemWithAccountId extends DiamoryItem {
  accountId: string;
}

export { DiamoryItem, DiamoryItemWithAccountId };
