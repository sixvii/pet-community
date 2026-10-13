FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends $PHPIZE_DEPS libssl-dev pkg-config unzip \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN printf 'upload_max_filesize=3M\npost_max_size=16M\nmax_file_uploads=5\nsession.save_path=/var/lib/php/sessions\n' \
        > /usr/local/etc/php/conf.d/uploads.ini \
    && a2enmod rewrite headers \
    && mkdir -p /var/lib/php/sessions \
    && chown www-data:www-data /var/lib/php/sessions \
    && chmod 1733 /var/lib/php/sessions

WORKDIR /app
COPY composer.json ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts

COPY . .
RUN composer dump-autoload --no-dev --optimize
COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY public/.htaccess /app/public/.htaccess

EXPOSE 80