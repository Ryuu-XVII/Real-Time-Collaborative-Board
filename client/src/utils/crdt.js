/**
 * crdt.js - merges state using last write wins (LWW)
 * keeps tombstones (deleted: true) in state so they dont reappear
 */

export function mergeCanvasStates(localElementsMap, incomingElementsArray) {
  // copy map so we dont mutate React state directly
  const mergedMap = new Map(localElementsMap);

  incomingElementsArray.forEach(incoming => {
    const existing = mergedMap.get(incoming.id);

    if (!existing) {
      // first time seeing this element, save it
      mergedMap.set(incoming.id, incoming);
      return;
    }

    const incomingTime = incoming.timestamp || 0;
    const existingTime = existing.timestamp || 0;

    if (incomingTime > existingTime) {
      mergedMap.set(incoming.id, incoming);
    } else if (incomingTime === existingTime) {
      // tiebreaker: fallback to alphabetical client id comparison so clients converge deterministically
      const incomingClient = incoming.clientId || '';
      const existingClient = existing.clientId || '';
      
      if (incomingClient > existingClient) {
        mergedMap.set(incoming.id, incoming);
      }
    }
  });

  return mergedMap;
}

// return only items that arent marked deleted
export function getActiveElements(elementsMap) {
  return Array.from(elementsMap.values()).filter(el => !el.deleted);
}
