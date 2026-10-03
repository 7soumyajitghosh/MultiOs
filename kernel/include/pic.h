#ifndef MOS_PIC_H
#define MOS_PIC_H

void pic_remap(void);
void pic_eoi(int irq);
void pic_set_mask(int irq, int masked);

#endif
