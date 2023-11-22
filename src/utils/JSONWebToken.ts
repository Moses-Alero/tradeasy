import jwt, { JwtPayload } from 'jsonwebtoken';
import { environment } from './config/environment';
import { IJwtSignPayload } from './interface';
// import type { IJwtDecodedPayload, IJwtSignPayload } from './interfaces';

export class JSONWebToken {
  sign(payload: IJwtSignPayload): string {
    return jwt.sign(payload, environment.appJwtSecret, { expiresIn: '100d' });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, environment.appJwtSecret) as JwtPayload;
  }
}
