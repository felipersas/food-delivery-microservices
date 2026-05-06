import { Controller, Get, Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { IncomingMessage } from 'http';

/**
 * tRPC Controller
 * 
 * Mounts the tRPC handler at /trpc endpoint
 * Handles incoming tRPC requests from other microservices
 * 
 * Note: This controller handles raw tRPC requests.
 * The actual routing is handled by tRPC based on procedure paths.
 */
@Controller('trpc')
@Injectable({ scope: Scope.REQUEST })
export class TrpcController {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject('TRPC_HANDLER') private readonly tRpcHandler: any,
  ) {}

  @Get(':path')
  async handleTrpcRequest(): Promise<any> {
    const request = this.request as any as Request & IncomingMessage;
    
    // Create a mock Request object for tRPC fetch adapter
    const tRpcRequest = new Request(request.url ?? '', {
      method: request.method,
      headers: request.headers as HeadersInit,
      body: request.body,
    });

    return this.tRpcHandler(tRpcRequest);
  }

  @Post(':path')
  async handleTrpcPostRequest(): Promise<any> {
    const request = this.request as any as Request & IncomingMessage;
    
    const tRpcRequest = new Request(request.url ?? '', {
      method: request.method,
      headers: request.headers as HeadersInit,
      body: request.body,
    });

    return this.tRpcHandler(tRpcRequest);
  }
}
