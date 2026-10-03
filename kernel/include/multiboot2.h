#ifndef MOS_MULTIBOOT2_H
#define MOS_MULTIBOOT2_H

#include "types.h"

#define MOS_MB2_MAGIC 0x36D76289u

#define MOS_MB2_TAG_END   0
#define MOS_MB2_TAG_CMDLINE 1
#define MOS_MB2_TAG_BOOTDEV 2
#define MOS_MB2_TAG_MEMINFO 4
#define MOS_MB2_TAG_MMAP    6
#define MOS_MB2_TAG_FB      8

#define MOS_MB2_MMAP_AVAILABLE        1
#define MOS_MB2_MMAP_RESERVED         2
#define MOS_MB2_MMAP_ACPI_RECLAIMABLE 3
#define MOS_MB2_MMAP_NVS              4
#define MOS_MB2_MMAP_BADRAM           5

struct mb2_tag {
    u32 type;
    u32 size;
};

struct mb2_mmap_entry {
    u64 base;
    u64 len;
    u32 type;
    u32 reserved;
};

struct mb2_mmap_tag {
    u32 type;
    u32 size;
    u32 entry_size;
    u32 entry_version;
    struct mb2_mmap_entry entries[];
};

struct mb2_meminfo_tag {
    u32 type;
    u32 size;
    u32 mem_lower;
    u32 mem_upper;
};

#endif
