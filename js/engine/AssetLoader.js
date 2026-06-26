export class AssetLoader {
  constructor() {
    this.images = {};
    this.total = 0;
    this.loaded = 0;
    this.failed = 0;
    this._ready = false;
    this._promise = null;
  }

  addImage(key, src) {
    this.total++;
    const img = new Image();
    this.images[key] = img;
    return new Promise((resolve) => {
      img.onload = () => {
        this.loaded++;
        resolve(true);
      };
      img.onerror = () => {
        this.failed++;
        console.warn(`Failed to load image: ${src}`);
        resolve(false);
      };
      img.src = src;
    });
  }

  loadAll(sources) {
    if (this._promise) return this._promise;
    const promises = Object.entries(sources).map(([key, src]) =>
      this.addImage(key, src)
    );
    this._promise = Promise.all(promises).then(() => {
      this._ready = true;
      return this;
    });
    return this._promise;
  }

  get(key) {
    return this.images[key] || null;
  }

  isReady() {
    return this._ready;
  }

  getStatus() {
    return {
      total: this.total,
      loaded: this.loaded,
      failed: this.failed,
      ready: this._ready
    };
  }
}

export default AssetLoader;
