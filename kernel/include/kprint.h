#ifndef MOS_KPRINT_H
#define MOS_KPRINT_H

void kputc(char c);
void kputs(const char *s);
int  kprintf(const char *fmt, ...);
int  klog(const char *tag, const char *fmt, ...);
void panic(const char *msg);

#endif
