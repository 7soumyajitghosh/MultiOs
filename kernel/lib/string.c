#include "string.h"

size_t strlen(const char *s) {
    size_t n = 0;
    while (s[n]) n++;
    return n;
}

int strcmp(const char *a, const char *b) {
    while (*a && *a == *b) { a++; b++; }
    return (int)(unsigned char)*a - (int)(unsigned char)*b;
}

int strncmp(const char *a, const char *b, size_t n) {
    for (size_t i = 0; i < n; i++) {
        unsigned char ca = (unsigned char)a[i];
        unsigned char cb = (unsigned char)b[i];
        if (ca != cb) return (int)ca - (int)cb;
        if (ca == 0) return 0;
    }
    return 0;
}

char *strcpy(char *dst, const char *src) {
    char *d = dst;
    while ((*d++ = *src++)) ;
    return dst;
}

char *strncpy(char *dst, const char *src, size_t n) {
    size_t i = 0;
    for (; i < n && src[i]; i++) dst[i] = src[i];
    for (; i < n; i++) dst[i] = 0;
    return dst;
}

char *strcat(char *dst, const char *src) {
    char *d = dst + strlen(dst);
    while ((*d++ = *src++)) ;
    return dst;
}

int memcmp(const void *a, const void *b, size_t n) {
    const unsigned char *p = (const unsigned char *)a;
    const unsigned char *q = (const unsigned char *)b;
    for (size_t i = 0; i < n; i++) {
        if (p[i] != q[i]) return (int)p[i] - (int)q[i];
    }
    return 0;
}

void *memcpy(void *dst, const void *src, size_t n) {
    unsigned char *d = (unsigned char *)dst;
    const unsigned char *s = (const unsigned char *)src;
    for (size_t i = 0; i < n; i++) d[i] = s[i];
    return dst;
}

void *memmove(void *dst, const void *src, size_t n) {
    unsigned char *d = (unsigned char *)dst;
    const unsigned char *s = (const unsigned char *)src;
    if (d < s) {
        for (size_t i = 0; i < n; i++) d[i] = s[i];
    } else if (d > s) {
        for (size_t i = n; i > 0; i--) d[i-1] = s[i-1];
    }
    return dst;
}

void *memset(void *s, int c, size_t n) {
    unsigned char *p = (unsigned char *)s;
    for (size_t i = 0; i < n; i++) p[i] = (unsigned char)c;
    return s;
}

int isspace_c(int c){return c==' '||c=='\t'||c=='\n'||c=='\r'||c=='\f'||c=='\v';}
int isdigit_c(int c){return c>='0'&&c<='9';}
long strtol_dec(const char *s,const char **end){while(isspace_c((unsigned char)*s))s++;int neg=0;if(*s=='-'){neg=1;s++;}else if(*s=='+'){s++;}long v=0;while(isdigit_c((unsigned char)*s)){v=v*10+(*s-'0');s++;}if(end)*end=s;return neg?-v:v;}

