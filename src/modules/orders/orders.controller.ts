import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  // POST /api/orders — Create order (Public checkout)
  @Post()
  async create(@Body() orderPayload: any) {
    const saved = await this.ordersService.create(orderPayload);
    return { success: true, orderId: saved._id.toString() };
  }

  private mapOrder(o: any) {
    if (!o) return null;
    // Normalize shippingAddress — schema uses fullName/addressLine1 etc.
    const sa = o.shippingAddress || {};
    const shipAddr = {
      name: sa.fullName || sa.name || (o.user?.name) || 'Guest',
      fullName: sa.fullName || sa.name || '',
      phone: sa.phone || (o.user?.phone) || o.phone || '',
      email: sa.email || (o.user?.email) || o.customerEmail || o.email || '',
      address: sa.addressLine1 || sa.address || '',
      addressLine1: sa.addressLine1 || sa.address || '',
      addressLine2: sa.addressLine2 || '',
      city: sa.city || '',
      state: sa.state || '',
      pincode: sa.pincode || '',
      country: sa.country || 'India',
    };
    // Normalize items — schema uses items[].name/price/quantity/image
    const items = (o.items || []).map((it: any) => ({
      id: it.product?.toString() || '',
      name: it.name || '',
      price: it.price || 0,
      quantity: it.quantity || 1,
      img: it.image || '',
    }));
    return {
      id: o.id || o._id.toString(),
      _id: o._id.toString(),
      items,
      itemsDetails: items,
      itemCount: items.length,
      shippingAddress: shipAddr,
      billingAddress: shipAddr,
      customerEmail: o.user?.email || sa.email || o.customerEmail || o.email || '',
      customerName: o.user?.name || shipAddr.name || sa.fullName || o.customerName || 'Valued Customer',
      paymentMethod: o.paymentMethod || 'cod',
      paymentStatus: o.paymentStatus || 'pending',
      status: o.status || 'pending',
      discount: o.discount || 0,
      shippingCharge: o.shippingCharge || 0,
      total: o.totalAmount || 0,
      totalAmount: o.totalAmount || 0,
      notes: o.notes || '',
      date: o.createdAt || new Date(),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }

  // GET /api/orders — Handles admin listing (all) and user profile listing (by email or phone)
  @Get()
  async getOrders(@Query('email') email?: string, @Query('phone') phone?: string) {
    if (phone) {
      const all = await this.ordersService.findAll();
      const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
      const filtered = all.filter((o: any) => {
        const p1 = (o.shippingAddress?.phone || '').replace(/[^0-9]/g, '');
        const p2 = (o.user?.phone || '').replace(/[^0-9]/g, '');
        return (cleanPhone && (p1.includes(cleanPhone) || p2.includes(cleanPhone)));
      });
      return filtered.map((o) => this.mapOrder(o));
    }
    if (email) {
      const list = await this.ordersService.findByEmail(email);
      return list.map((o) => this.mapOrder(o));
    }
    const list = await this.ordersService.findAll();
    return list.map((o) => this.mapOrder(o));
  }

  // POST /api/orders/update-status — Admin update order status
  @Post('update-status')
  async updateStatus(@Body() body: { orderId: string; status: string }) {
    try {
      const saved = await this.ordersService.updateStatus(body.orderId, {
        status: body.status,
      });
      return { success: true, order: this.mapOrder(saved) };
    } catch (err) {
      console.error('API update-status ERROR:', err);
      throw err;
    }
  }

  // POST /api/orders/razorpay/create-order — Initiate payment
  @Post('razorpay/create-order')
  @HttpCode(HttpStatus.OK)
  async createRazorpayOrder(@Body() body: { amount: number }) {
    return this.ordersService.createRazorpayOrder(body.amount);
  }

  // POST /api/orders/razorpay/verify-payment — Validate signatures
  @Post('razorpay/verify-payment')
  @HttpCode(HttpStatus.OK)
  async verifyRazorpayPayment(@Body() body: any) {
    return this.ordersService.verifyRazorpayPayment(body);
  }

  // POST /api/orders/ccavenue/initiate — Start CCAvenue checkout flow
  @Post('ccavenue/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateCCAvenue(@Body() body: any) {
    return this.ordersService.initiateCCAvenue(body);
  }

  // POST /api/orders/ccavenue/redirect — Handle payment status response redirect from CCAvenue gateway
  @Post('ccavenue/redirect')
  async ccavenueRedirect(@Body('encResp') encResp: string, @Res() res: Response) {
    const result = await this.ordersService.handleCCAvenueResponse(encResp);
    return res.redirect(result.redirectUrl);
  }

  // GET /api/orders/:id — Public/Admin fetch specific order
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const o = await this.ordersService.findById(id, undefined, true);
    return this.mapOrder(o);
  }

  // PATCH /api/orders/:id/status — REST Admin update status
  @Patch(':id/status')
  async patchStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const saved = await this.ordersService.updateStatus(id, body);
    return this.mapOrder(saved);
  }

  // POST /api/orders/bulk-delete — Bulk delete orders by IDs array
  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() body: { ids: string[] }) {
    return this.ordersService.deleteBulkOrders(body.ids || []);
  }

  // DELETE /api/orders/:id — Delete single order by ID
  @Delete(':id')
  async deleteOrder(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }
}
