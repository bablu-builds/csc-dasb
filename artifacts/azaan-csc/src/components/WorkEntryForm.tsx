import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/contexts/SettingsContext';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Loader2, IndianRupee, XCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  mobile: z.string().length(10, 'Mobile must be exactly 10 digits').regex(/^\d+$/, 'Must be only digits'),
  category: z.string().min(1, 'Category is required'),
  workDetail: z.string().optional(),
  date: z.date(),
  totalAmount: z.coerce.number().min(0, 'Amount cannot be negative'),
  paidAmount: z.coerce.number().min(0, 'Amount cannot be negative'),
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
    const dataWithTimestamp = {
      ...values,
      date: Timestamp.fromDate(values.date)
    };
    await onSubmit(dataWithTimestamp);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number *</FormLabel>
                <FormControl>
                  <Input placeholder="10 digits" maxLength={10} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-2">
                <FormLabel className="mb-1">Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="workDetail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Detail / Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional notes about the work..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-lg border">
          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Amount (₹)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paidAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid Amount (₹)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2 pt-1">
            <label className="block text-sm font-medium leading-none">Due Amount (₹)</label>
            <div className={cn(
              "p-2.5 rounded-md border font-semibold flex items-center gap-2",
              due > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
            )}>
              <IndianRupee className="h-4 w-4" />
              {due}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Optional address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Rejection fields — only shown when status is Rejected */}
        {status === 'Rejected' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="col-span-full flex items-center gap-2 text-red-700 font-medium text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Rejection Details
            </div>
            <FormField
              control={form.control}
              name="rejectionReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rejection Reason (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Wrong documents, Customer cancelled" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="refundAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Amount (₹, optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-9"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Work Entry
          </Button>
        </div>
      </form>
    </Form>
  );
}
