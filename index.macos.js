/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';

import { 
  AppRegistry, 
  Dimensions,
  FlatList,
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ProgressViewIOS,
  Button,
  Image,
  NativeModules,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';


const {FileManager} = NativeModules;
const window = Dimensions.get('window');
console.log('windowSize', window);
console.log('windowSize', Dimensions.get('screen'));
// console.log('windowSize', Dimensions.get('app'));

function removePrefix(fullpath, path){
  let endingSlash = path[path.length - 1] === '/';
  return fullpath.substr(endingSlash ? path.length : path.length + 1);
}


function humanize(value, decimal) {
  value = value || 0;
  let i = -1;
  let byteUnits = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  do {
    value = value / 1024;
    i++;
  } while (value > 1024);

  return value.toFixed(decimal || 0) + byteUnits[i][0];
}

const CompactSection = ({group, count, size, onPress}) => {
        // <View style={styles.compactCountBadge}>
        //   <Text style={styles.compactCount}>{count}</Text>
        // </View>

  return(
    <TouchableOpacity onPress={onPress}>
      <View style={styles.compactSection}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.compactHeader}>{group.name} </Text>
          <Button title={count + ''} bezelStyle='rounded' type='momentaryLight' />
        </View>
        <Text style={styles.compactSize}>{humanize(size, 2)}</Text>
      </View>
    </TouchableOpacity>
  ) 
}


export default class XcodeCleaner extends Component {
  constructor(props){
    super(props);

    this.state = {
      data: {},
      progress: {},
      tab: '',
    };
  }

  componentWillMount(){
    LayoutAnimation.easeInEaseOut();
  }

  async componentDidMount(){
    this.calculateXcode();
  }

  updateProgress(section, current, total){
    this.setState({
      progress: {
        ...this.state.progress,
        [section]: [current, total]
      },
    })
  }

  async calculateSubDirectory(path, progressKey, labelGetter) {
    console.log('calculate Path', path);
    let folders = await FileManager.listDirectory(path, true);

    let totalSize = 0;
    let groups = [];
    this.updateProgress(progressKey, 0, folders.length);

    for(let i=0; i<folders.length; i++){
      let folder = folders[i];
      let label = removePrefix(folder, path);

      if (labelGetter){
        label = await labelGetter(folder);
      }
      let size = await FileManager.getDirectorySize(folder);
      totalSize += size;

      groups.push({
        path: folder,
        label: label,
        size: size,
      });

      this.updateProgress(progressKey, i + 1, folders.length);

      groups.sort(function(a, b){
        return b.size - a.size;
      });

      this.setState({
        data: {
          ...this.state.data,
          [progressKey]: {
            size: totalSize,
            groups: groups,
          }
        }
      })
    }

    if (progressKey === 'simulator'){
      for(let i=0; i<groups.length; i++){
        try{
          let simulator = groups[i];
          let simulatorPath = simulator.path;
          let contents = await FileManager.parsePlist(simulatorPath + '/device.plist');

          name = contents.name || contents.UDID;
          runtime = (contents.runtime || '').split('.');
          version = runtime[runtime.length - 1];
          version = version.replace(/(\d+)-/g, '$1.').replace(/-/, ' ');

          simulator.label = `${name} (${version})`;
        } catch (e){
          console.log('error', e);
          continue;
        }
      }

      this.setState({
        data: {
          ...this.state.data,
          [progressKey]: {
            size: totalSize,
            groups: groups,
          }
        }
      })
    }

    return groups;
  }

  async calculateXcode() {
    let home = await FileManager.getHomeDirectory();
    let developer = `${home}/Library/Developer/`;
    let xcode = developer + 'Xcode/';

    await this.calculateSubDirectory(xcode + 'iOS DeviceSupport/', 'deviceSupport');
    await this.calculateSubDirectory(xcode + 'DerivedData/', 'derivedData');
    await this.calculateSubDirectory(xcode + 'Archives/', 'archives');
    await this.calculateSubDirectory(developer + 'CoreSimulator/Devices/', 'simulator');

  }

  async trashDirectory(groupKey, item) {
    let path = item.path;

    if (path){
      try{
        await FileManager.trashDirectory(path);
        let group = this.state.data[groupKey];
        let index = group.groups.indexOf(item);

        if (!group || index === -1){
          return;
        }

        let groups = group.groups.slice();
        groups.splice(index, 1)

        this.setState({
          data: {
            ...this.state.data,
            [groupKey]: {
              size: group.size - item.size,
              groups: groups,
            }
          }
        })

      } catch (e){
        console.log('errrr', e);
      }
    }
  }

  renderItem(item, groupKey){
    return (
      <View style={styles.listItem}>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <Text style={styles.itemSize}>{humanize(item.size, 1)}</Text>
        <Button 
          // title='Reveal' 
          style={{width: 30}}
          image={{uri: 'search'}}
          onPress={() => FileManager.revealInFinder(item.path)}
          bezelStyle='circular' 
          />
        <Button 
          style={{
            width: 30,
            margin: 0,
          }}
          title='' 
          bezelStyle='circular' 
          image={{uri: 'trash'}}
          onPress={() => this.trashDirectory(groupKey, item)}
           />
      </View>  
    )
  }

  toggleTab(tab){
    LayoutAnimation.easeInEaseOut();
    this.setState({
      tab: this.state.tab === tab ? null : tab,
    });
  }

  render() {
    let groups = [
      {
        name: 'iOS DeviceSupport', 
        key: 'deviceSupport',
        description: 'Only need to keep the latest iOS version, feed free to remove old versions.',
      },
      {
        name: 'DerivedData', 
        key: 'derivedData',
        description: "It's safe to clear the entire folder, you'll need to rebuild your projects.",
      },
      {
        key: 'archives',
        name: 'Archives', 
        description: "You can't debug deployed versions if you remove old archives.",
      },
      {
        key: 'simulator',
        name: 'CoreSimulator', 
        description: "Your apps' data are stored here. I suggest you run `xcrun simctl delete unavailable` to safely reduce the size.",
      }
    ];


    return (
      <View style={styles.container}>
        <View style={[styles.row, styles.header]}>
          <Image 
            source={{uri: 'AppIcon.icns'}}  
            style={{width: 40, height: 40}}/>

          <Text style={styles.title}> Xcode Cleaner </Text>
        </View> 

        {groups.map((group, idx) => {
          let data = this.state.data[group.key] || {};
          let progress = this.state.progress[group.key];
          let progressValue = 0;

          if (progress){
            let current = progress[0];
            let total = progress[1];
            progressValue = total === 0 ? 1 : (current / total);
          }

          let count = data.groups ? data.groups.length : 0;
          let compactMode = this.state.tab && this.state.tab !== group.key;

          return (
            <View style={[
              styles.section,
              this.state.tab && this.state.tab !== group.key && styles.inactiveTab,
              this.state.tab && this.state.tab === group.key && styles.activeTab,
            ]} key={'group' + idx}>
              <TouchableOpacity onPress={() => this.toggleTab(group.key)}>
                <View style={[
                  styles.row, 
                  styles.sectionHeader,
                ]}>
                  <View style={styles.rowLeft}>
                    <View style={styles.headerWithBadge}>
                      <Text style={styles.name}>{group.name}</Text>
                      {count ? <Button title={count + ''} bezelStyle='rounded' type='momentaryLight' /> : null}
                    </View>
                    {!compactMode && <Text style={styles.description}>{group.description}</Text> }
                  </View>

                  <View style={styles.rowRight}>
                    {data.size ? (
                      <Text style={styles.size}> {humanize(data.size)} </Text>
                    ) : null}
                  </View>
                </View>  
              </TouchableOpacity>

              <View style={{height: 20}}>
                {progress && progressValue < 1 ? <ProgressViewIOS progressTintColor={sizeColor} progress={progressValue} /> : null }
              </View>

              {this.state.tab === group.key ? (
                <FlatList
                  contentContainerStyle={styles.listContainer}
                  // showsVerticalScrollIndicator={true}
                  style={styles.list}
                  data={data.groups}
                  keyExtractor={(item, index) => item.path}
                  renderItem={({item}) => this.renderItem(item, group.key)}
                  />
              ) : null}
            </View>  
          )
        })}
      </View>
    );
  }
}

// const backgroundColor = 'rgb(17,29,38)';
// const cardBackground = 'rgb(22,41,53)';
// const textColor = 'rgb(251,252,253)';

// const backgroundColor = '#878ECD';
// const cardBackground = '#B9BBDF';
// const textColor = '#878ecd';
// const positive = 'rgb(0, 162,235)';

// const backgroundColor = '#2E3B3E';
// const cardBackground = '#50666B';
// const textColor = '#F9B8BE';
// const positive = '#FD6378';

const backgroundColor = 'transparent'
// const cardBackground= 'rgb(255,78,93)'
const cardBackground= 'transparent'
const textColor = '#333';
const secondaryTextColor = '#888';
const positive = 'blue';
// const fontFamily = 'sans-serif';
const fontFamily = 'HelveticaNeue';
// const fontFamily = 'Menlo';
const marginHorizontal = 20;
const sizeColor = 'rgb(255,78,93)';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: backgroundColor,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginHorizontal: marginHorizontal,
    borderColor: sizeColor,
    // borderRadius: 30,
    // backgroundColor: 'green',
    // borderBottomColor: '#000',
  },
  section: {
    borderRadius: 10,
    marginHorizontal: marginHorizontal,
    paddingVertical: 20,
    // marginBottom: 1,
    // borderBottomWidth: 1,
    // backgroundColor: 'yellow',
    // backgroundColor: cardBackground,
    // borderWidth: 1,
    // borderColor: '#fff',
    // borderBottomColor: '#eee',
  },
  sectionHeader: {
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  rowRight: {
    // width: 150,
    // justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    color: textColor,
    fontFamily: fontFamily,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: secondaryTextColor,
    lineHeight: 20,
  },

  size: {
    fontSize: 30,
    color: positive,
    fontWeight: 'bold',
    color: sizeColor,
  },
  button: {
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    fontSize: 20,
    color: positive,
  },
  title: {
    fontSize: 15,
    textAlign: 'center',
    margin: 20,
    fontWeight: 'bold',
    fontFamily: fontFamily,
    color: '#888',
  },
  list: {
    borderRadius: 8,
    // borderWidth: 1,
    // borderColor: '#444',
  },
  listContainer: {
    backgroundColor: '#fff',
    padding: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    alignItems: 'center',
  },
  itemLabel: {
    fontFamily: fontFamily,
    flex: 1,
    fontSize: 12,
  },
  itemSize: {
    fontSize: 12,
    marginRight: 10,
  },
  activeTab: {
    flex: 1,
  },
  inactiveTab: {
    height: 50,
  },

  compactSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: marginHorizontal,
    borderWidth: 1,
    alignItems: 'center',
  },
  headerWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginBottom: 10,
  },
  compactHeader: {
    // flex: 1,
    fontSize: 18,
    color: textColor,
    fontFamily: fontFamily,
    fontWeight: 'bold',
  },
  compactCountBadge: {
    backgroundColor: '#ddd',
    borderRadius: 10,
    height: 20,
  },
  compactCount: {
    fontSize: 18,
    marginRight: 20,
  },
  compactSize: {
    fontSize: 18,
    color: sizeColor,
    fontWeight: 'bold',
  }
});

AppRegistry.registerComponent('XcodeCleaner', () => XcodeCleaner);
