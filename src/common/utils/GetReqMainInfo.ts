import { Request } from 'express';

export const getReqMainInfo: (req: Request) => { [p: string]: any } = (req) => {
  const { query, headers, url, method, body, socket } = req;

  // 获取 IP
  const xRealIp = headers ? headers['X-Real-IP'] : null;
  const xForwardedFor = headers ? headers['X-Forwarded-For']: null;
  const host = headers? headers.host: null;
  const { ip: cIp } = req;
  const { remoteAddress } = socket || {};
  const ip = xRealIp || xForwardedFor || cIp || remoteAddress;

  return {
    url,
    host,
    ip,
    method,
    query,
    body,
  };
};
