export class Counter {
  constructor(value = 0) {
    this.value = value;
  }

  increment(step = 1) {
    this.value += step;
    return this.value;
  }
}
