/**
 * Buffer polyfill for browser and React Native environments
 * 
 * This file provides a Buffer polyfill for browser and React Native environments
 * to ensure compatibility with Node.js code that uses Buffer.
 */

// Check if Buffer is already defined (Node.js or React Native with buffer polyfill)
if (typeof Buffer === 'undefined' || !(Buffer.isBuffer)) {
  console.log('Initializing Buffer polyfill for mobile/browser environment');
  
  // Define a Buffer class that extends Uint8Array
  class BufferPolyfill extends Uint8Array {
    constructor(arg: number | ArrayBuffer | Uint8Array | number[] | string, encodingOrOffset?: string | number, length?: number) {
      if (typeof arg === 'number') {
        super(arg);
      } else if (arg instanceof ArrayBuffer) {
        super(arg, encodingOrOffset as number, length);
      } else if (arg instanceof Uint8Array || Array.isArray(arg)) {
        super(arg);
      } else if (typeof arg === 'string') {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(arg);
        super(uint8Array);
      } else {
        super(0);
      }
    }

    // Add toString method
    toString(encoding?: string): string {
      try {
        const decoder = new TextDecoder(encoding || 'utf-8');
        return decoder.decode(this);
      } catch (e) {
        return Array.from(this)
          .map(byte => String.fromCharCode(byte))
          .join('');
      }
    }
  }

  // Add static methods to BufferPolyfill
  Object.defineProperties(BufferPolyfill, {
    from: {
      value: function(input: ArrayBuffer | Uint8Array | string | number[], encodingOrOffset?: string | number, length?: number): Uint8Array {
        if (input instanceof ArrayBuffer) {
          return new BufferPolyfill(input, encodingOrOffset as number, length);
        } else if (input instanceof Uint8Array || Array.isArray(input)) {
          return new BufferPolyfill(input);
        } else if (typeof input === 'string') {
          return new BufferPolyfill(input);
        }
        return new BufferPolyfill(0);
      },
      writable: true,
      configurable: true,
    },
    isBuffer: {
      value: function(obj: any): boolean {
        return obj instanceof BufferPolyfill || obj instanceof Uint8Array;
      },
      writable: true,
      configurable: true,
    },
    alloc: {
      value: function(size: number, fill?: number): Uint8Array {
        const buffer = new BufferPolyfill(size);
        if (fill !== undefined) {
          buffer.fill(fill);
        }
        return buffer;
      },
      writable: true,
      configurable: true,
    },
    allocUnsafe: {
      value: function(size: number): Uint8Array {
        return new BufferPolyfill(size);
      },
      writable: true,
      configurable: true,
    },
    concat: {
      value: function(list: Uint8Array[], totalLength?: number): Uint8Array {
        if (list.length === 0) {
          return new BufferPolyfill(0);
        }
        
        let length = totalLength;
        if (length === undefined) {
          length = 0;
          for (const buf of list) {
            length += buf.byteLength;
          }
        }
        
        const result = new BufferPolyfill(length);
        let offset = 0;
        for (const buf of list) {
          result.set(buf, offset);
          offset += buf.byteLength;
        }
        
        return result;
      },
      writable: true,
      configurable: true,
    },
    byteLength: {
      value: function(string: string, encoding?: string): number {
        if (typeof string !== 'string') {
          return (string as any).byteLength || (string as any).length || 0;
        }
        
        // Use TextEncoder to get byte length of string
        const encoder = new TextEncoder();
        return encoder.encode(string).length;
      },
      writable: true,
      configurable: true,
    }
  });

  // Assign the polyfill to global Buffer
  (globalThis as any).Buffer = BufferPolyfill;
}

export {};
