import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/contexts/SettingsContext';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Loader2, IndianRupee, XCircle, Receipt } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  mobile: z.string().length(10, 'Mobile must be exactly 10 digits').regex(/^\d+$/, 'Must be only digits'),
  category: z.string().min(1, 'Category is required'),
  workDetail: z.string().optional(),
  date: z.date(),
  totalAmount: z.coerce.number().min(0, 'Amount cannot be negative'),
  paidAmount: z.coerce.number().min(0, 'Amount cannot be negative'),
  challanAmount: z.coerce.number().min(0, 'Amount cannot be negative').optional(),
  status: z.enum(['Pending', 'Completed', 'Rejected']),
  address: z.string().optional(),
  rejectionReason: z.string().optional(),
  refundAmount: z.coerce.number().min(0, 'Amount cannot be negative').optional(),
});

export type WorkEntryFormData = z.infer<typeof formSchema>;

interface WorkEntryFormProps {
  initialData?: Partial<WorkEntryFormData>;
  onSubmit: (data: Omit<WorkEntryFormData, 'date'> & { date: Timestamp }) => Promise<void>;
  isSubmitting?: boolean;
}

export function WorkEntryForm({ initialData, onSubmit, isSubmitting = false }: WorkEntryFormProps) {
  const { categories } = useSettings();

  const form = useForm<WorkEntryFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: initialData?.customerName || '',
      mobile: initialData?.mobile || '',
      category: initialData?.category || '',
      workDetail: initialData?.workDetail || '',
      date: initialData?.date || new Date(),
      totalAmount: initialData?.totalAmount || 0,
      paidAmount: initialData?.paidAmount || 0,
      challanAmount: initialData?.challanAmount ?? 0,
      status: initialData?.status || 'Pending',
      address: initialData?.address || '',
      rejectionReason: initialData?.rejectionReason || '',
      refundAmount: initialData?.refundAmount ?? undefined,
    },
  });

  const total = form.watch('totalAmount');
  const paid = form.watch('paidAmount');
  const status = form.watch('status');
  const due = Math.max(0, (total || 0) - (paid || 0));

  const handleSubmit = async (values: WorkEntryFormData) => {
    await onSubmit({ ...values, date: Timestamp.fromDate(values.date) });
  };

  const inputClass = "h-10 bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Customer info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField control={form.control} name="customerName" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Customer Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="mobile" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Mobile Number <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="10-digit mobile" maxLength={10} className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Work Category <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-sm font-medium">Date <span className="text-destructive">*</span></FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline"
                      className={cn("h-10 pl-3 text-left font-normal border-border bg-background", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange}
                    disabled={(d) => d > new Date() || d < new Date("1900-01-01")} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Work detail */}
        <FormField control={form.control} name="workDetail" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Work Detail / Notes</FormLabel>
            <FormControl>
              <Textarea placeholder="Describe the work, document type, or any notes..." className="bg-background border-border resize-none" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Amount section */}
        <div className="p-5 bg-muted/30 rounded-xl border space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Details</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField control={form.control} name="totalAmount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Total Amount (₹)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className={cn(inputClass, "pl-9")} {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="paidAmount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Paid Amount (₹)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className={cn(inputClass, "pl-9")} {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="challanAmount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  Challan (₹)
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" placeholder="0" className={cn(inputClass, "pl-9")}
                      {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? 0 : e.target.value)} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <label className="block text-sm font-medium leading-none">Due Amount (₹)</label>
              <div className={cn(
                "h-10 px-3 rounded-md border font-semibold flex items-center gap-2 text-sm",
                due > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
              )}>
                <IndianRupee className="h-4 w-4" />
                {due.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Pending">🟡 Pending</SelectItem>
                  <SelectItem value="Completed">🟢 Completed</SelectItem>
                  <SelectItem value="Rejected">🔴 Rejected</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Customer Address</FormLabel>
              <FormControl>
                <Input placeholder="Optional address" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Rejection fields */}
        {status === 'Rejected' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-red-50/80 rounded-xl border border-red-200">
            <div className="col-span-full flex items-center gap-2 text-red-700 font-semibold text-sm">
              <XCircle className="h-4 w-4" /> Rejection Details
            </div>
            <FormField control={form.control} name="rejectionReason" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Rejection Reason</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Wrong documents, Customer cancelled" className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="refundAmount" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Refund Amount (₹)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className={cn(inputClass, "pl-9")} placeholder="0"
                      {...field} value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[160px] h-11 font-semibold shadow-sm">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Work Entry
          </Button>
        </div>
      </form>
    </Form>
  );
}
