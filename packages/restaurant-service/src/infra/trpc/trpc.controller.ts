import { Controller, Get, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

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
export class TrpcController {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject('TRPC_HANDLER') private readonly tRpcHandler: any,
  ) {}

  @Get(':path')
  async handleTrpcRequest(): Promise<any> {
    const tRpcRequest = new Request(this.request.url ?? '', {
      method: this.request.method,
      headers: this.request.headers as HeadersInit,
      body: this.request.body,
    });

    return this.tRpcHandler(tRpcRequest);
  }

  @Post(':path')
  async handleTrpcPostRequest(): Promise<any> {
    const tRpcRequest = new Request(this.request.url ?? '', {
      method: this.request.method,
      headers: this.request.headers as HeadersInit,
      body: this.request.body,
    });

    return this.tRpcHandler(tRpcRequest);
  }
}
