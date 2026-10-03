#ifndef MOS_SERIAL_H
#define MOS_SERIAL_H

void serial_init(void);
void serial_putc(char c);
void serial_puts(const char *s);
void serial_write(const char *s, unsigned long long n);
int serial_received(void);
char serial_read(void);

#endif
