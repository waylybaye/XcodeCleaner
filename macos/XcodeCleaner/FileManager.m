//
//  FileManager.m
//  XcodeCleaner
//
//  Created by Baye Wayly on 2017/10/12.
//  Copyright © 2017年 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Carbon/Carbon.h>
#import <AppKit/AppKit.h>
#import <React/RCTConvert.h>

#import "FileManager.h"
#include <dirent.h>
#include <sys/stat.h>


@implementation FileManager
{
}


RCT_EXPORT_MODULE()


RCT_REMAP_METHOD(getHomeDirectory,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(NSHomeDirectory());
}

//RCT_REMAP_METHOD(getLibraryDirectory,
//                 resolver:(RCTPromiseResolveBlock)resolve
//                 rejecter:(RCTPromiseRejectBlock)reject)
//{
//  resolve(NSLibraryDirectory());
//}

RCT_EXPORT_METHOD(revealInFinder: (NSString*) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSArray *fileURLs = [NSArray arrayWithObjects:[NSURL fileURLWithPath:path isDirectory:YES], nil];
  [[NSWorkspace sharedWorkspace] activateFileViewerSelectingURLs:fileURLs];
}


RCT_EXPORT_METHOD(listDirectory: (NSString*) path
                  onlyDirectory:(BOOL) onlyDirectory
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSArray* dirs = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path
                                                                      error:NULL];
  NSMutableArray *results = [[NSMutableArray alloc] init];
  [dirs enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
    NSString* filename = (NSString *)obj;
    NSString* fullPath = [path stringByAppendingPathComponent:filename];
    
    BOOL isDirectory = NO;
    [[NSFileManager defaultManager] fileExistsAtPath:fullPath isDirectory:&isDirectory];
    
    if (!onlyDirectory){
      [results addObject:fullPath];
      
    } else if (isDirectory) {
      [results addObject:fullPath];
    }
  }];
  
  resolve(results);
}


RCT_EXPORT_METHOD(getDirectorySize:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSLog(@"calculate size %@", path);
  unsigned long long size = [self getFolderSize:path];
  NSLog(@"size %llul", size);
  resolve([NSNumber numberWithUnsignedLongLong:size]);
}


RCT_EXPORT_METHOD(trashDirectory: (NSString*)path
                  withResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSURL *url = [NSURL fileURLWithPath:path isDirectory:YES];
  NSArray *files = [NSArray arrayWithObject: url];
  [[NSWorkspace sharedWorkspace] recycleURLs:files completionHandler:^(NSDictionary *newURLs, NSError *error) {
    if (error != nil) {
      //do something about the error
      NSLog(@"%@", error);
    }
    for (NSString *file in newURLs) {
      NSLog(@"File %@ moved to %@", file, [newURLs objectForKey:file]);
    }
  }];
}


-(unsigned long long)getFolderSize : (NSString *)folderPath;

{
  char *dir = (char *)[folderPath fileSystemRepresentation];
  DIR *cd;
  
  struct dirent *dirinfo;
  int lastchar;
  struct stat linfo;
  static unsigned long long totalSize = 0;
  
  cd = opendir(dir);
  
  if (!cd) {
    return 0;
  }
  
  while ((dirinfo = readdir(cd)) != NULL) {
    if (strcmp(dirinfo->d_name, ".") && strcmp(dirinfo->d_name, "..")) {
      char *d_name;
      
      
      d_name = (char*)malloc(strlen(dir)+strlen(dirinfo->d_name)+2);
      
      if (!d_name) {
        //out of memory
        closedir(cd);
        exit(1);
      }
      
      strcpy(d_name, dir);
      lastchar = strlen(dir) - 1;
      if (lastchar >= 0 && dir[lastchar] != '/')
        strcat(d_name, "/");
      strcat(d_name, dirinfo->d_name);
      
      if (lstat(d_name, &linfo) == -1) {
        free(d_name);
        continue;
      }
      if (S_ISDIR(linfo.st_mode)) {
        if (!S_ISLNK(linfo.st_mode))
          [self getFolderSize:[NSString stringWithCString:d_name encoding:NSUTF8StringEncoding]];
        free(d_name);
      } else {
        if (S_ISREG(linfo.st_mode)) {
          totalSize+=linfo.st_size;
        } else {
          free(d_name);
        }
      }
    }
  }
  
  closedir(cd);
  
  return totalSize;
  
}


-(unsigned long long) fastFolderSizeAtFSRef:(FSRef*) theFileRef
{
  FSIterator    thisDirEnum = NULL;
  unsigned long long totalSize = 0;
  
  // Iterate the directory contents, recursing as necessary
  if (FSOpenIterator(theFileRef, kFSIterateFlat, &thisDirEnum) ==
      noErr)
  {
    const ItemCount kMaxEntriesPerFetch = 256;
    ItemCount actualFetched;
    FSRef    fetchedRefs[kMaxEntriesPerFetch];
    FSCatalogInfo fetchedInfos[kMaxEntriesPerFetch];
    
    
    OSErr fsErr = FSGetCatalogInfoBulk(thisDirEnum,
                                       kMaxEntriesPerFetch, &actualFetched,
                                       NULL, kFSCatInfoDataSizes |
                                       kFSCatInfoNodeFlags, fetchedInfos,
                                       fetchedRefs, NULL, NULL);
    while ((fsErr == noErr) || (fsErr == errFSNoMoreItems))
    {
      ItemCount thisIndex;
      for (thisIndex = 0; thisIndex < actualFetched; thisIndex++)
      {
        // Recurse if it's a folder
        if (fetchedInfos[thisIndex].nodeFlags &
            kFSNodeIsDirectoryMask)
        {
          totalSize += [self
                        fastFolderSizeAtFSRef:&fetchedRefs[thisIndex]];
        }
        else
        {
          // add the size for this item
          totalSize += fetchedInfos
          [thisIndex].dataLogicalSize;
        }
      }
      
      if (fsErr == errFSNoMoreItems)
      {
        break;
      }
      else
      {
        // get more items
        fsErr = FSGetCatalogInfoBulk(thisDirEnum,
                                     kMaxEntriesPerFetch, &actualFetched,
                                     NULL, kFSCatInfoDataSizes |
                                     kFSCatInfoNodeFlags, fetchedInfos,
                                     fetchedRefs, NULL, NULL);
      }
    }
    FSCloseIterator(thisDirEnum);
  }
  return totalSize;
}

@end

