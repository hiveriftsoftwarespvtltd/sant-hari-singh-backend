import { Controller, Get, Post, Query, Body, Headers } from '@nestjs/common';
import { ShiprocketService } from './shiprocket.service';

@Controller(['shiprocket', 'api/shiprocket'])
export class ShiprocketController {
  constructor(private readonly shiprocketService: ShiprocketService) {}

  /**
   * GET /shiprocket/products?page=1&limit=100
   * GET /api/shiprocket/products?page=1&limit=100
   * GET /shiprocket/products?collection_id=1234&page=1&limit=100
   */
  @Get('products')
  async getProducts(
    @Query('collection_id') collectionId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('host') hostHeader?: string,
  ) {
    return this.shiprocketService.getProducts(collectionId, page, limit, hostHeader);
  }

  /**
   * GET /shiprocket/collections?page=1&limit=100
   * GET /api/shiprocket/collections?page=1&limit=100
   */
  @Get('collections')
  async getCollections(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('host') hostHeader?: string,
  ) {
    return this.shiprocketService.getCollections(page, limit, hostHeader);
  }

  /**
   * GET /shiprocket/products-by-collection?collection_id=1234&page=1&limit=100
   * GET /api/shiprocket/products-by-collection?collection_id=1234&page=1&limit=100
   */
  @Get('products-by-collection')
  async getProductsByCollection(
    @Query('collection_id') collectionId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('host') hostHeader?: string,
  ) {
    return this.shiprocketService.getProducts(collectionId, page, limit, hostHeader);
  }

  /**
   * Shiprocket OTP Endpoints
   */
  @Post('send-otp')
  async sendOtp(@Body() body: { mobile?: string; phone?: string }) {
    const numberToUse = body.mobile || body.phone || '';
    return this.shiprocketService.sendOtp(numberToUse);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { mobile?: string; phone?: string; otp: string }) {
    const numberToUse = body.mobile || body.phone || '';
    return this.shiprocketService.verifyOtp(numberToUse, body.otp);
  }

  /**
   * Shiprocket Headless Checkout Access Token API
   */
  @Post('checkout-token')
  async createCheckoutToken(@Body() body: { items?: any[]; redirect_url?: string; cart_discount?: any; custom_attributes?: any }) {
    return this.shiprocketService.createCheckoutToken(body.items || [], body.redirect_url, body.cart_discount, body.custom_attributes);
  }

  /**
   * Webhook Endpoints
   */
  @Post(['order', 'order/create', 'order/sync', 'webhook', 'shiprocket-order'])
  async createOrderWebhook(@Body() body: any) {
    return this.shiprocketService.handleOrderSync(body);
  }

  @Post(['order/update', 'order-update', 'status-update'])
  async updateOrderWebhook(@Body() body: any) {
    return this.shiprocketService.handleOrderUpdate(body);
  }

  @Post('inventory')
  async inventoryWebhook(@Body() body: any) {
    return this.shiprocketService.handleInventorySync(body);
  }
}

