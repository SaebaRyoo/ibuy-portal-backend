import { Request } from 'express';

export const getReqMainInfo: (req: Request) => { [p: string]: any } = (req) => {
  const { query, headers, url, method, body, socket } = req;

  // 获取 IP
  const xRealIp = headers['X-Real-IP'];
  const xForwardedFor = headers['X-Forwarded-For'];
  const { ip: cIp } = req;
  const { remoteAddress } = socket || {};
  const ip = xRealIp || xForwardedFor || cIp || remoteAddress;

  return {
    url,
    host: headers.host,
    ip,
    method,
    query,
    body,
  };
};
