interface DiamoryItem {
  id: string;
  payloadTimestamp: number;
  checksum: string;
}

interface StoredDiamoryItem extends DiamoryItem {
  accountId: string;
  v: 1;
}

export { DiamoryItem, StoredDiamoryItem };
