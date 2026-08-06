export const handleResponse = (res, statusCode, message, data = {}) => {
  const success = statusCode >= 200 && statusCode < 300;

  const normalizeId = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    // Convert _id to plain string if it's a BSON ObjectId or similar object
    if (obj._id !== undefined) {
      const id = obj._id;
      if (typeof id === 'object' && id !== null) {
        if (typeof id.toHexString === 'function') {
          obj._id = id.toHexString();
        } else if (id.$oid) {
          obj._id = String(id.$oid);
        } else if (typeof id.toString === 'function' && id.toString() !== '[object Object]') {
          obj._id = id.toString();
        }
      }
      // Ensure id virtual matches _id
      if (!obj.id && obj._id) obj.id = obj._id;
    }
    return obj;
  };

  const sanitize = (item) => {
    if (!item) return item;

    // Handle Mongoose documents
    let obj = item;
    if (typeof item.toObject === 'function') {
      obj = item.toObject();
    } else if (typeof item === 'object') {
      // Recursively sanitize if it's a plain object that might contain Mongoose docs
      obj = { ...item };
      for (const key in obj) {
        if (obj[key] && typeof obj[key].toObject === 'function') {
          obj[key] = obj[key].toObject();
          // Clean the nested object too
          const { updatedAt, __v, password, ...rest } = obj[key];
          obj[key] = rest;
        }
      }
    }

    const { updatedAt, __v, password, ...cleaned } = obj;
    return normalizeId(cleaned);
  };

  const formatOrderIds = (obj, visited = new WeakSet()) => {
    if (obj == null) return obj;
    if (typeof obj === 'string') {
      if (obj.toUpperCase().startsWith('ORD-') && obj.length > 8) {
        return obj.substring(0, 4) + obj.substring(obj.length - 4);
      }
      return obj;
    }
    if (typeof obj !== 'object') {
      return obj;
    }
    if (visited.has(obj)) {
      return '[Circular]';
    }
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
      return obj;
    }
    if (typeof obj.toHexString === 'function') {
      return obj.toHexString();
    }
    if (obj.$oid) {
      return String(obj.$oid);
    }

    visited.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => formatOrderIds(item, visited));
    }

    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = formatOrderIds(obj[key], visited);
      }
    }
    return copy;
  };

  const sanitizedData = Array.isArray(data)
    ? data.map(sanitize)
    : sanitize(data);

  const formattedData = formatOrderIds(sanitizedData);

  const responsePayload = {
    success,
    error: !success,
    message,
  };

  if (Array.isArray(formattedData)) {
    responsePayload.results = formattedData;
  } else {
    responsePayload.result = formattedData;
  }

  return res.status(statusCode).json(responsePayload);
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Distance in km
};

export default handleResponse;