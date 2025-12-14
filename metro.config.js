const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 插入 svg 处理器
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// 告诉打包器：把 svg 当作源码文件，而不是资源文件
const { assetExts, sourceExts } = config.resolver;
config.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg'];

module.exports = config;