import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Globe, CalendarDays } from 'lucide-react';

interface WorldClock {
  city: string;
  timezone: string;
  offset: string;
}

const worldClocks: WorldClock[] = [
  { city: 'New York', timezone: 'America/New_York', offset: 'EST/EDT' },
  { city: 'London', timezone: 'Europe/London', offset: 'GMT/BST' },
  { city: 'Tokyo', timezone: 'Asia/Tokyo', offset: 'JST' },
  { city: 'Sydney', timezone: 'Australia/Sydney', offset: 'AEST/AEDT' },
  { city: 'Dubai', timezone: 'Asia/Dubai', offset: 'GST' },
];

export const ClockCalendarWidget = () => {
  const [localTime, setLocalTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date, timezone?: string) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    };
    
    if (timezone) {
      options.timeZone = timezone;
    }
    
    return date.toLocaleTimeString('en-US', options);
  };

  const formatDate = (date: Date, timezone?: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    
    if (timezone) {
      options.timeZone = timezone;
    }
    
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Clock & Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="local" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Local
            </TabsTrigger>
            <TabsTrigger value="world" className="text-xs sm:text-sm">
              <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              World
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">
              <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="mt-4">
            <div className="text-center space-y-2">
              <div className="text-4xl sm:text-5xl font-bold font-mono text-primary">
                {formatTime(localTime)}
              </div>
              <div className="text-lg text-muted-foreground">
                {formatDate(localTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="world" className="mt-4">
            <div className="space-y-3">
              {worldClocks.map((clock) => (
                <div
                  key={clock.city}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <div className="font-medium">{clock.city}</div>
                    <div className="text-xs text-muted-foreground">{clock.offset}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold">
                      {formatTime(localTime, clock.timezone)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(localTime, clock.timezone)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border pointer-events-auto"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
