#ifndef MOS_KPRINT_H
#define MOS_KPRINT_H

#include "types.h"

int kprintf(const char *fmt, ...);
int klog(const char *tag, const char *fmt, ...);
void panic(const char *msg);

#endif
