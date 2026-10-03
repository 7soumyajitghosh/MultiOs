#ifndef MOS_KPRINT_H
#define MOS_KPRINT_H

void kputc(char c);
void kputs(const char *s);
void kprintf(const char *fmt, ...);
void klog(const char *tag, const char *fmt, ...);
void panic(const char *fmt, ...);

#endif
