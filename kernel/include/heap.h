#ifndef MOS_HEAP_H
#define MOS_HEAP_H

#include "types.h"

void heap_init(void);
void *kmalloc(size_t size);
void kfree(void *ptr);
void *kcalloc(size_t n, size_t size);
void *krealloc(void *ptr, size_t new_size);
void heap_stats(u64 *total, u64 *used, u64 *free_bytes);

#endif
