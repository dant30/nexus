export class SubscriptionManager {
  constructor() {
    this.subs = new Map();
  }

  add(key, payload) {
    this.subs.set(key, payload);
  }

  remove(key) {
    this.subs.delete(key);
  }

  list() {
    return Array.from(this.subs.values());
  }
}
