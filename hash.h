#include <stdint.h>
#define hash_t struct Hash *

struct Hash
{
    uint32_t h0;
    uint32_t h1;
    uint32_t h2;
    uint32_t h3;
    uint32_t h4;
    uint32_t h5;
    uint32_t h6;
    uint32_t h7;
};

struct Hash sha256(const unsigned char *data);
struct Hash hash_or(hash_t a, hash_t b);