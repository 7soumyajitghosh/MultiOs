#ifndef MOS_SERIAL_H
#define MOS_SERIAL_H

#include "types.h"

void serial_init(void);
int  serial_ready(void);
void serial_putc(char c);
void serial_write(const char *s, size_t n);
void serial_puts(const char *s);

#endif
