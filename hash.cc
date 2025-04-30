#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "hash.h"
 
#define rightrotate(w, n) ((w >> n) | (w) << (32-(n)))
 
static const uint32_t k[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};
/*
unsigned char * hash_to_string(hash_t hash) { //remember to free after using
    unsigned char *out = (unsigned char *)malloc(65);
    sprintf((char *)out, "%08x%08x%08x%08x%08x%08x%08x%08x", hash->h0, hash->h1, hash->h2, hash->h3, hash->h4, hash->h5, hash->h6, hash->h7);
    return out;
}*/

struct Hash hash_or(hash_t a, hash_t b) {
    if (a -> h0 == 0 && a -> h1 == 0 && a -> h2 == 0 && a -> h3 == 0 && a -> h4 == 0 && a -> h5 == 0 && a -> h6 == 0 && a -> h7 == 0) {
        return *b;
    }
    if (b -> h0 == 0 && b -> h1 == 0 && b -> h2 == 0 && b -> h3 == 0 && b -> h4 == 0 && b -> h5 == 0 && b -> h6 == 0 && b -> h7 == 0) {
        return *a;
    }
    struct Hash out;
    out.h0 = a->h0 | b->h0;
    out.h1 = a->h1 | b->h1;
    out.h2 = a->h2 | b->h2;
    out.h3 = a->h3 | b->h3;
    out.h4 = a->h4 | b->h4;
    out.h5 = a->h5 | b->h5;
    out.h6 = a->h6 | b->h6;
    out.h7 = a->h7 | b->h7;
    unsigned char *str = (unsigned char *)malloc(65);
    sprintf((char *)str, "%08x%08x%08x%08x%08x%08x%08x%08x", out.h0, out.h1, out.h2, out.h3, out.h4, out.h5, out.h6, out.h7);
    out = sha256(str);
    free(str);
    return out;
}
 
struct Hash sha256(const unsigned char *data) {
    uint32_t h0 = 0x6a09e667;
    uint32_t h1 = 0xbb67ae85;
    uint32_t h2 = 0x3c6ef372;
    uint32_t h3 = 0xa54ff53a;
    uint32_t h4 = 0x510e527f;
    uint32_t h5 = 0x9b05688c;
    uint32_t h6 = 0x1f83d9ab;
    uint32_t h7 = 0x5be0cd19;
    size_t len = strlen((const char *)data);
    int r = (int)(len * 8 % 512);
    int append = ((r < 448) ? (448 - r) : (448 + 512 - r)) / 8;
    size_t new_len = len + append + 8;// 原始数据+填充+64bit位数
    unsigned char buf[new_len];
    bzero(buf + len, append); //将内存（字符串）前n个字节清零<string.h>
    if (len > 0) {
        memcpy(buf, data, len);
    }
    buf[len] = (unsigned char)0x80;
    uint64_t bits_len = len * 8;
    for (int i = 0; i < 8; i++) {
        buf[len + append + i] = (bits_len >> ((7 - i) * 8)) & 0xff;
    }
    uint32_t w[64];
    bzero(w, 64);
    size_t chunk_len = new_len / 64; //分512bit区块
    for (int idx = 0; idx < chunk_len; idx++) {
        uint32_t val = 0;
        for (int i = 0; i < 64; i++) {//将块分解为16个32-bit的big-endian的字，记为w[0], …, w[15]
            val =  val | (*(buf + idx * 64 + i) << (8 * (3 - i)));
            if (i % 4 == 3) {
                w[i / 4] = val;
                val = 0;
            }
        }
        for (int i = 16; i < 64; i++) {//前16个字直接由以上消息的第i个块分解得到，其余的字由如下迭代公式得到：
            uint32_t s0 = rightrotate(w[i - 15], 7) ^ rightrotate(w[i - 15], 18) ^ (w[i - 15] >> 3);
            uint32_t s1 = rightrotate(w[i - 2], 17) ^ rightrotate(w[i - 2], 19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16] + s0 + w[i - 7] + s1;
        }
        
        uint32_t a = h0;
        uint32_t b = h1;
        uint32_t c = h2;
        uint32_t d = h3;
        uint32_t e = h4;
        uint32_t f = h5;
        uint32_t g = h6;
        uint32_t h = h7;
        for (int i = 0; i < 64; i++) {
            uint32_t s_1 = rightrotate(e, 6) ^ rightrotate(e, 11) ^ rightrotate(e, 25);
            uint32_t ch = (e & f) ^ (~e & g);
            uint32_t temp1 = h + s_1 + ch + k[i] + w[i];
            uint32_t s_0 = rightrotate(a, 2) ^ rightrotate(a, 13) ^ rightrotate(a, 22);
            uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
            uint32_t temp2 = s_0 + maj;
            h = g;
            g = f;
            f = e;
            e = d + temp1;
            d = c;
            c = b;
            b = a;
            a = temp1 + temp2;
        }
        h0 += a;
        h1 += b;
        h2 += c;
        h3 += d;
        h4 += e;
        h5 += f;
        h6 += g;
        h7 += h;
    }
    struct Hash out;
    out.h0 = h0;
    out.h1 = h1;
    out.h2 = h2;
    out.h3 = h3;
    out.h4 = h4;
    out.h5 = h5;
    out.h6 = h6;
    out.h7 = h7;
    return out;
}