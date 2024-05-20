export const createBid = async (attrs: CreateBidAttrs) => {
  return withLock(
    attrs.itemId,
    async (lockedClient: typeof client, signal: any) => {
      const item = await getItem(attrs.itemId);

      //   await pause(5000);

      if (!item) {
        throw new Error("Item does not exist");
      }
      if (item.price >= attrs.amount) {
        throw new Error("Bid too low");
      }
      if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
        throw new Error("Item closed to bidding");
      }

      const serialized = serializeHistory(
        attrs.amount,
        attrs.createdAt.toMillis()
      );

      // this was replaced by proxy in lock.ts
      //   if (signal.expired) {
      //     throw new Error("Lock expired, cant write any more data");
      //   }

      return Promise.all([
        lockedClient.rPush(bidHistoryKey(attrs.itemId), serialized),
        lockedClient.hSet(itemsKey(item.id), {
          bids: item.bids + 1,
          price: attrs.amount,
          highestBidUserId: attrs.userId,
        }),
        lockedClient.zAdd(itemsByPriceKey(), {
          value: item.id,
          score: attrs.amount,
        }),
      ]);
    }
  );

  // return client.executeIsolated(async (isolatedClient) => {
  // 	await isolatedClient.watch(itemsKey(attrs.itemId));

  // 	const item = await getItem(attrs.itemId);

  // 	if (!item) {
  // 		throw new Error('Item does not exist');
  // 	}
  // 	if (item.price >= attrs.amount) {
  // 		throw new Error('Bid too low');
  // 	}
  // 	if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
  // 		throw new Error('Item closed to bidding');
  // 	}

  // 	const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

  // 	return isolatedClient
  // 		.multi()
  // 		.rPush(bidHistoryKey(attrs.itemId), serialized)
  // 		.hSet(itemsKey(item.id), {
  // 			bids: item.bids + 1,
  // 			price: attrs.amount,
  // 			highestBidUserId: attrs.userId
  // 		})
  // 		.zAdd(itemsByPriceKey(), {
  // 			value: item.id,
  // 			score: attrs.amount
  // 		})
  // 		.exec();
  // });
};
