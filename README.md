# 如何启动

## 安装包

`npm install` 或者 `yarn`

## 本地运行

### 1. 配置.env.dev文件
根据.env.example文件配置.env.dev文件

### 2. 使用docker-compose启动容器
`docker-compose -f ./docker-compose.dev.yml --env-file .env.dev up -d`

### 3. 本地运行后台服务
`yarn run start:dev`


## 服务器运行

### 1. 配置env文件

根据.env.example文件配置.env.dev文件

不过需要注意的是所有的`host`都要改成`docker-compose.yml`中的服务名
比如`POSTGRES_HOST=postgres` , `REDIS_HOST=redis`, `ELASTICSEARCH_HOST=es01`

### 2. 启动容器
`docker-compose -f ./docker-compose.yml --env-file .env up -d`

### 3. 访问地址测试
使用如下命令在命令行测试一下，如果能正确返回，则表示部署成功
`curl -X GET http://localhost:8000/v1/category/all`