import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import OrdersTab from '../components/OrdersTab';
import BookingsTab from '../components/BookingsTab';
import CustomersTab from '../components/CustomersTab';

const ReportPage = () => {
    return (
        <div className="container mx-auto grid gap-2 z-10">
            <Card className="py-6 flex-row justify-between gap-6 border-border/80 rounded-xl">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Báo cáo & Thống kê
                    </CardTitle>
                    <CardDescription>Báo cáo thống kê hệ thống</CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="orders" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 rounded-xl">
                    <TabsTrigger value="orders">Đơn hàng</TabsTrigger>
                    <TabsTrigger value="bookings">Đặt bàn</TabsTrigger>
                    <TabsTrigger value="customers">Khách hàng</TabsTrigger>
                </TabsList>

                <TabsContent value="orders">
                    <OrdersTab />
                </TabsContent>

                <TabsContent value="bookings">
                    <BookingsTab />
                </TabsContent>

                <TabsContent value="customers">
                    <CustomersTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ReportPage;
