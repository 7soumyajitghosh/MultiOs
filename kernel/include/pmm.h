#ifndef MOS_PMM_H
#define MOS_PMM_H

#include "types.h"

struct mos_bootinfo;

void pmm_init(struct mos_bootinfo *bi);
void *pmm_alloc_page(void);
void pmm_free_page(void *p);
u64 pmm_total_pages(void);
u64 pmm_free_pages(void);
u64 pmm_used_pages(void);

#endif
