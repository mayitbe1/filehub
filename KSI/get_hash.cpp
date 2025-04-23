#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>

int main() {
    // const char *filepath = "/Users/dyf/Desktop/FileHub/public/signatureFile";
    const char *filepath = "../public/signatureFile";
    int pre = 2;
    while (1) {
        
         // 分配足够的内存，包括路径分隔符、数字和结束符
    char *filename = (char *)malloc(5); // "/" + 数字(最多2位) + '\0'
    if (!filename) {
        printf("Failed to allocate memory for filename\n");
        return 1;
    }
    
    // 使用 snprintf 更安全，并检查返回值
    int ret = snprintf(filename, 5, "/%d", pre);
    if (ret < 0 || ret >= 5) {
        printf("Failed to format filename\n");
        free(filename);
        return 1;
    }
    
    // 计算完整路径长度并分配内存
    size_t fullpath_len = strlen(filepath) + strlen(filename) + 1;
    char *fullpath = (char *)malloc(fullpath_len);
    if (!fullpath) {
        printf("Failed to allocate memory for fullpath\n");
        free(filename);
        return 1;
    }
    
    // 使用 snprintf 一次性完成路径拼接
    ret = snprintf(fullpath, fullpath_len, "%s%s", filepath, filename);
    if (ret < 0 || ret >= fullpath_len) {
        printf("Failed to format fullpath\n");
        free(filename);
        free(fullpath);
        return 1;
    }

        FILE *file = fopen(fullpath, "r");
        printf("open file %s\n", fullpath);
        if (file == NULL) {
            printf("Failed to open file\n");
            free(filename);
            free(fullpath);
            continue;
        }
        time_t t1 = time(NULL);
        time_t t2 = time(NULL);
        while (t2 - t1 > 10) {
            t2 = time(NULL);
            char *line = (char *)malloc(256);
            size_t len = 0;
            ssize_t read;
            read = getline(&line, &len, file);
            if (read == -1) {
                continue;
            }
            // TODO upload
            free(line);
        }
        // delete file
        remove(fullpath);
        printf("delete file %s\n", fullpath);
        free(filename);
        free(fullpath);
        fclose(file);
        if (pre < 3) ++pre;
        else pre = 1;
    }
    return 0;
}